#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

@interface LabInventoryFilePicker : NSObject <RCTBridgeModule, UIDocumentPickerDelegate>
@property (nonatomic, copy) RCTPromiseResolveBlock pendingResolve;
@property (nonatomic, copy) RCTPromiseRejectBlock pendingReject;
@end

@implementation LabInventoryFilePicker
RCT_EXPORT_MODULE(LabInventoryFilePicker)

RCT_REMAP_METHOD(pickExcel,
                 pickExcelWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.pendingResolve) {
      reject(@"PICKER_BUSY", @"A file selection is already in progress.", nil);
      return;
    }

    self.pendingResolve = resolve;
    self.pendingReject = reject;
    UTType *xlsx = [UTType typeWithFilenameExtension:@"xlsx"] ?: UTTypeItem;
    UTType *xls = [UTType typeWithFilenameExtension:@"xls"] ?: UTTypeItem;
    UIDocumentPickerViewController *picker =
        [[UIDocumentPickerViewController alloc] initForOpeningContentTypes:@[xlsx, xls] asCopy:YES];
    picker.delegate = self;
    picker.allowsMultipleSelection = NO;

    UIViewController *presenter = nil;
    for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
      if (![scene isKindOfClass:[UIWindowScene class]] || scene.activationState != UISceneActivationStateForegroundActive) continue;
      for (UIWindow *window in ((UIWindowScene *)scene).windows) {
        if (window.isKeyWindow) {
          presenter = window.rootViewController;
          break;
        }
      }
      if (presenter) break;
    }
    while (presenter.presentedViewController) presenter = presenter.presentedViewController;
    if (!presenter) {
      self.pendingResolve = nil;
      self.pendingReject = nil;
      reject(@"NO_PRESENTER", @"The file picker is unavailable right now.", nil);
      return;
    }
    [presenter presentViewController:picker animated:YES completion:nil];
  });
}

- (void)documentPicker:(UIDocumentPickerViewController *)controller didPickDocumentsAtURLs:(NSArray<NSURL *> *)urls
{
  NSURL *url = urls.firstObject;
  if (!url) {
    [self finishWithValue:nil];
    return;
  }

  NSNumber *size = nil;
  [url getResourceValue:&size forKey:NSURLFileSizeKey error:nil];
  NSString *extension = url.pathExtension.lowercaseString;
  NSString *mime = [extension isEqualToString:@"xls"]
      ? @"application/vnd.ms-excel"
      : @"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  NSMutableDictionary *file = [@{
    @"uri": url.absoluteString,
    @"name": url.lastPathComponent ?: @"lab-inventory.xlsx",
    @"type": mime,
  } mutableCopy];
  if (size) file[@"size"] = size;
  [self finishWithValue:file];
}

- (void)documentPickerWasCancelled:(UIDocumentPickerViewController *)controller
{
  [self finishWithValue:nil];
}

- (void)finishWithValue:(id)value
{
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  self.pendingResolve = nil;
  self.pendingReject = nil;
  if (resolve) resolve(value);
}

@end
